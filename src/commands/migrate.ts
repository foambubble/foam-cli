import GithubSlugger from 'github-slugger';
import { Command, flags } from '@oclif/command';
import ora from 'ora';
import { MarkdownResourceProvider } from "../core/markdown-provider";
import { bootstrap } from '../core/model/foam';
import { URI } from '../core/model/uri';
import { Resource } from '../core/model/note';
import { generateHeading, generateLinkReferences } from '../core/janitor';
import { applyTextEdit } from '../core/janitor/apply-text-edit';
import { FileDataStore, Matcher } from '../core/services/datastore';
import { writeFileToDisk } from '../utils/write-file-to-disk';
import { renameFile } from '../utils/rename-file';
import { isValidDirectory } from '../utils';

const slugger = new GithubSlugger();

const isNote = (resource: Resource): resource is Resource => resource.type === 'note'

const getKebabCaseFileName = (fileName: string) => {
  const kebabCasedFileName = slugger.slug(fileName);
  return kebabCasedFileName === fileName ? null : kebabCasedFileName;
};

// @todo: Refactor 'migrate' and 'janitor' commands and avoid repeatition
export default class Migrate extends Command {
  static description =
    'Updates file names, link references and heading across all the markdown files in the given workspaces';

  static examples = [
    `$ foam-cli migrate path-to-foam-workspace
Successfully generated link references and heading!
`,
  ];

  static flags = {
    'without-extensions': flags.boolean({
      char: 'w',
      description:
        'generate link reference definitions without extensions (for legacy support)',
    }),
    help: flags.help({ char: 'h' }),
  };

  static args = [{ name: 'workspacePath' }];

  async run() {
    const spinner = ora('Reading Files').start();

    const { args, flags } = this.parse(Migrate);

    const { workspacePath = './' } = args;

    const matcher = new Matcher(
      [URI.file(workspacePath)],
      ['**/*'],
      []
    );
    const dataStore = new FileDataStore();
    const markdownProvider = new MarkdownResourceProvider(matcher);

    if (isValidDirectory(workspacePath)) {
      let workspace = (await bootstrap(matcher, dataStore, [markdownProvider])).workspace;

      let notes = workspace.list().filter(isNote);

      spinner.succeed();
      spinner.text = `${notes.length} files found`;
      spinner.succeed();

      // exit early if no files found.
      if (notes.length === 0) {
        this.exit();
      }

      // Kebab case file names
      const fileRename = notes.map(note => {
        if (note.title != null) {
          const kebabCasedFileName = getKebabCaseFileName(note.title);
          if (kebabCasedFileName) {
            return renameFile(note.uri, kebabCasedFileName);
          }
        }
        return Promise.resolve(null);
      });

      await Promise.all(fileRename);

      spinner.text = 'Renaming files';

      // Reinitialize the graph after renaming files
      workspace = (await bootstrap(matcher, dataStore, [markdownProvider])).workspace;

      notes = workspace.list().filter(isNote);

      spinner.succeed();
      spinner.text = 'Generating link definitions';

      const fileWritePromises = await Promise.all(
        notes.map(note => {
          // Get edits
          const heading = generateHeading(note);
          const definitions = generateLinkReferences(
            note,
            workspace,
            !flags['without-extensions']
          );

          // apply Edits
          let file = note.source.text;
          file = heading ? applyTextEdit(file, heading) : file;
          file = definitions ? applyTextEdit(file, definitions) : file;

          if (heading || definitions) {
            return writeFileToDisk(note.uri, file);
          }

          return Promise.resolve(null);
        })
      );

      await Promise.all(fileWritePromises);

      spinner.succeed();
      spinner.succeed('Done!');
    } else {
      spinner.fail('Directory does not exist!');
    }
  }
}
