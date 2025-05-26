import React, { lazy, Suspense, useState, useEffect } from 'react';
import cx from 'classnames';
import styles from './index.module.scss';

// Import the styles for the editor
import '@mdxeditor/editor/style.css';

// Lazy load the MDXEditor and all related plugins
const loadMDXEditor = async () => {
  const module = await import('@mdxeditor/editor');
  return {
    MDXEditor: module.MDXEditor,
    headingsPlugin: module.headingsPlugin,
    listsPlugin: module.listsPlugin,
    quotePlugin: module.quotePlugin,
    thematicBreakPlugin: module.thematicBreakPlugin,
    markdownShortcutPlugin: module.markdownShortcutPlugin,
    linkPlugin: module.linkPlugin,
    linkDialogPlugin: module.linkDialogPlugin,
    imagePlugin: module.imagePlugin,
    codeBlockPlugin: module.codeBlockPlugin,
    codeMirrorPlugin: module.codeMirrorPlugin,
    frontmatterPlugin: module.frontmatterPlugin,
    diffSourcePlugin: module.diffSourcePlugin,
    toolbarPlugin: module.toolbarPlugin,
    UndoRedo: module.UndoRedo,
    BoldItalicUnderlineToggles: module.BoldItalicUnderlineToggles,
    BlockTypeSelect: module.BlockTypeSelect,
    CreateLink: module.CreateLink,
    InsertImage: module.InsertImage,
    DiffSourceToggleWrapper: module.DiffSourceToggleWrapper,
  };
};

const LazyMDXEditor = lazy(() =>
  loadMDXEditor().then(module => ({ default: module.MDXEditor })),
);

const NoteEditor = ({
  value = '',
  setValue,
  readOnly,
  hideToolBar,
  classes = {},
}: {
  value: string;
  setValue: (value: string) => void;
  readOnly?: boolean;
  hideToolBar?: boolean;
  classes?: {
    editor?: string;
    contentEditableClassName?: string;
  };
}) => {
  const [editorComponents, setEditorComponents] = useState(null);

  useEffect(() => {
    loadMDXEditor().then(components => {
      setEditorComponents(components);
    });
  }, []);

  if (!editorComponents) {
    return <div>Loading editor...</div>;
  }

  const {
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    linkPlugin,
    linkDialogPlugin,
    imagePlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    frontmatterPlugin,
    diffSourcePlugin,
    toolbarPlugin,
    UndoRedo,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    CreateLink,
    InsertImage,
    DiffSourceToggleWrapper,
  } = editorComponents;

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <LazyMDXEditor
        markdown={value}
        onChange={setValue}
        readOnly={readOnly}
        className={cx(styles.container, classes.editor)}
        contentEditableClassName={classes.contentEditableClassName}
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
    </Suspense>
  );
};

export default NoteEditor;
