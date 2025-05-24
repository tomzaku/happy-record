import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  toolbarPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  diffSourcePlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertCodeBlock,
  InsertFrontmatter,
  DiffSourceToggleWrapper,
} from '@mdxeditor/editor';

import '@mdxeditor/editor/style.css';

import styles from './index.module.scss';

const NoteEditor = ({
  value = '',
  setValue,
  readOnly,
  hideToolBar,
}: {
  value: string;
  setValue: (value: string) => void;
  readOnly?: boolean;
  hideToolBar?: boolean;
}) => {
  return (
    <div className={styles.container}>
      <MDXEditor
        markdown={value}
        onChange={setValue}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
          codeMirrorPlugin({
            codeBlockLanguages: { js: 'JavaScript', css: 'CSS' },
          }),
          frontmatterPlugin(),
          diffSourcePlugin(),
          ...(hideToolBar
            ? []
            : [
                toolbarPlugin({
                  toolbarContents: () => (
                    <DiffSourceToggleWrapper>
                      <UndoRedo />
                      <BoldItalicUnderlineToggles />
                      <BlockTypeSelect />
                      <CreateLink />
                      <InsertImage />
                    </DiffSourceToggleWrapper>
                  ),
                }),
              ]),
        ]}
      />
    </div>
  );
};

export default NoteEditor;
