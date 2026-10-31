import type { Range as TiptapRange } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import { Button } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Typography from "@tiptap/extension-typography";
import {
  BubbleMenu,
  EditorContent,
  Extension,
  ReactRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Suggestion from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  HiH1,
  HiH2,
  HiH3,
  HiOutlineBold,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCodeBracket,
  HiOutlineCodeBracketSquare,
  HiOutlineItalic,
  HiOutlineListBullet,
  HiOutlineNumberedList,
  HiOutlineStrikethrough,
  HiOutlineTableCells,
} from "react-icons/hi2";
import {
  TbColumnInsertRight,
  TbColumnRemove,
  TbRowInsertBottom,
  TbRowRemove,
  TbTableOff,
} from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import tippy from "tippy.js";
import { Markdown } from "tiptap-markdown";

import { getAvatarUrl } from "~/utils/helpers";
import Avatar from "./Avatar";
import { YouTubeNode } from "./YouTubeEmbed/YouTubeNode";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    slashSuggestion: {
      setSlashSuggestion: () => ReturnType;
    };
  }
}

export interface SlashCommandItem {
  title: string;
  icon?: React.ReactNode;
  command?: (props: { editor: TiptapEditor; range: TiptapRange }) => void;
  disabled?: boolean;
}

export interface SlashCommandsOptions {
  suggestion?: Partial<SuggestionOptions>;
  commandItems?: SlashCommandItem[];
  options?: any;
}

function filterSlashCommandItems(items: SlashCommandItem[], query: string) {
  return items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
}

export interface RenderSuggestionsProps {
  editor: TiptapEditor;
  clientRect: () => DOMRect;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface WorkspaceMember {
  publicId: string;
  user: {
    id: string | null;
    name: string | null;
    image: string | null;
  } | null;
  email: string;
}

const CommandsList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
  }
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="w-56 rounded-md border-[1px] border-light-200 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200">
      <div className="max-h-[350px] overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => command(item)}
            className={twMerge(
              "group flex w-full items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300",
              index === selectedIndex && "bg-light-200 dark:bg-dark-300",
            )}
          >
            <span className="text-dark-700 dark:text-dark-800">
              {item.icon}
            </span>
            <span className="ml-3 text-[12px] font-medium text-dark-900 dark:text-dark-1000">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandsList.displayName = "CommandsList";

const RenderSuggestions = () => {
  let reactRenderer: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: RenderSuggestionsProps) => {
      reactRenderer = new ReactRenderer(CommandsList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) return;

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: reactRenderer.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },
    onUpdate(props: RenderSuggestionsProps) {
      reactRenderer.updateProps(props);

      if (!props.clientRect) return;

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },
    onKeyDown(props: SuggestionKeyDownProps): boolean {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide();
        return true;
      }

      return (
        (
          reactRenderer.ref as {
            onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
          }
        ).onKeyDown?.(props) ?? false
      );
    },
    onExit() {
      popup?.[0]?.destroy();
      reactRenderer.destroy();
    },
  };
};

interface MentionItem {
  id: string;
  label: string;
  image: string | null;
}

const MentionList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  {
    items: MentionItem[];
    command: (item: MentionItem) => void;
  }
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="w-56 rounded-md border-[1px] border-light-200 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200">
      <div className="max-h-[350px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-light-200 dark:scrollbar-thumb-dark-300">
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => command(item)}
              className={twMerge(
                "group flex w-full items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300",
                index === selectedIndex && "bg-light-200 dark:bg-dark-300",
              )}
            >
              <Avatar
                size="xs"
                name={item.label}
                imageUrl={item.image ? getAvatarUrl(item.image) : undefined}
                email={item.label}
              />
              <span className="ml-3 text-[12px] font-medium text-dark-900 dark:text-dark-1000">
                {item.label}
              </span>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-start p-2">
            <span className="text-[12px] text-dark-900 dark:text-dark-1000">
              No results
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";

const renderMentionSuggestions = () => {
  let reactRenderer: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: any) => {
      reactRenderer = new ReactRenderer(MentionList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) return;

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: reactRenderer.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },
    onUpdate(props: any) {
      reactRenderer.updateProps(props);
      if (!props.clientRect) return;
      popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide();
        return true;
      }
      return (
        (
          reactRenderer.ref as {
            onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
          }
        ).onKeyDown?.(props) ?? false
      );
    },
    onExit() {
      popup?.[0]?.destroy();
      reactRenderer.destroy();
    },
  };
};

const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slash-commands",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return filterSlashCommandItems(
            this.parent().commandItems ?? [],
            query,
          );
        },
        render: () => {
          let component: ReturnType<typeof RenderSuggestions>;
          return {
            onStart: (props: any) => {
              component = RenderSuggestions();
              component.onStart(props);
            },
            onUpdate(props: any) {
              component.onUpdate(props);
            },
            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                return true;
              }
              return component.onKeyDown(props) ?? false;
            },
            onExit: () => {
              component.onExit();
            },
          };
        },
      },
      commandItems: [] as SlashCommandItem[],
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        render: RenderSuggestions,
      } as SuggestionOptions),
    ];
  },
});

export interface SlashNodeAttrs {
  id: string | null;
  label?: string | null;
}

const getCommandItems = (
  disableHeadings: boolean,
  enableTables: boolean,
): SlashCommandItem[] => {
  const headingCommands: SlashCommandItem[] = disableHeadings
    ? []
    : [
        {
          title: t`Heading 1`,
          icon: <HiH1 />,
          command: ({ editor }) =>
            editor.chain().focus().setHeading({ level: 1 }).run(),
        },
        {
          title: t`Heading 2`,
          icon: <HiH2 />,
          command: ({ editor }) =>
            editor.chain().focus().setHeading({ level: 2 }).run(),
        },
        {
          title: t`Heading 3`,
          icon: <HiH3 />,
          command: ({ editor }) =>
            editor.chain().focus().setHeading({ level: 3 }).run(),
        },
      ];

  return [
    ...headingCommands,
    {
      title: t`Bullet List`,
      icon: <HiOutlineListBullet />,
      command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: t`Ordered List`,
      icon: <HiOutlineNumberedList />,
      command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: t`Blockquote`,
      icon: <HiOutlineChatBubbleLeftEllipsis />,
      command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: t`Code Block`,
      icon: <HiOutlineCodeBracketSquare />,
      command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
    },
    ...(enableTables
      ? [
          {
            title: t`Table`,
            icon: <HiOutlineTableCells />,
            command: ({ editor }: { editor: TiptapEditor }) =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
          },
        ]
      : []),
  ];
};

export default function Editor({
  content,
  onChange,
  onBlur,
  onSubmit,
  readOnly = false,
  workspaceMembers,
  enableYouTubeEmbed = true,
  placeholder,
  disableHeadings = false,
  variant = "compact",
}: {
  content: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  workspaceMembers: WorkspaceMember[];
  enableYouTubeEmbed?: boolean;
  placeholder?: string;
  disableHeadings?: boolean;
  variant?: "compact" | "document";
}) {
  const isDocument = variant === "document";
  const containerRef = useRef<HTMLDivElement>(null);

  // useEditor is created once (empty deps below), so keep the latest callbacks
  // in refs to avoid the editor capturing stale closures on re-render.
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: disableHeadings ? false : undefined,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: "text-blue-600 hover:text-blue-800 underline cursor-pointer",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          validate: (href) => /^https?:\/\//.test(href),
          autolink: true,
          linkOnPaste: true,
        }),
        Markdown.configure({ transformPastedText: true }),
        Placeholder.configure({
          placeholder: readOnly
            ? ""
            : (placeholder ??
              t`Add description... (type '/' to open commands or '@' to mention)`),
        }),
        SlashCommands.configure({
          commandItems: getCommandItems(disableHeadings, isDocument),
          suggestion: {
            items: ({ query }: { query: string }) =>
              filterSlashCommandItems(
                getCommandItems(disableHeadings, isDocument),
                query,
              ),
            startOfLine: true,
            char: "/",
          },
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            items: ({ query }: { query: string }) => {
              const withEmail = workspaceMembers.filter(
                (member) => member.email,
              );

              const mapped = withEmail.map((member: WorkspaceMember) => ({
                id: member.publicId,
                label: member?.user?.name?.trim() || member.email || "",
                image: member?.user?.image ?? null,
              }));

              const all: MentionItem[] = mapped.filter(
                (item) => item.label && item.label.length > 0,
              );

              const q = query.toLowerCase().trim();

              if (q === "") {
                return all;
              }

              const filtered = all.filter((u) =>
                u.label.toLowerCase().includes(q),
              );
              return filtered;
            },
            command: ({ editor, range, props }) => {
              const id = props.id ?? "";
              const label = props.label ?? "";
              const mentionHTML = `<span data-type="mention" data-id="${id}" data-label="${label}">@${label}</span>&nbsp;`;

              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent(mentionHTML)
                .focus()
                .run();
            },
            render: renderMentionSuggestions,
          },
          renderText({ options, node }) {
            return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
          },
        }),
        Typography.configure({
          openDoubleQuote: false,
          closeDoubleQuote: false,
          openSingleQuote: false,
          closeSingleQuote: false,
          oneHalf: false,
          oneQuarter: false,
          threeQuarters: false,
          superscriptTwo: false,
          superscriptThree: false,
        }),
        ...(enableYouTubeEmbed ? [YouTubeNode] : []),
        ...(isDocument
          ? [
              Table.configure({ resizable: true }),
              TableRow,
              TableHeader,
              TableCell,
            ]
          : []),
      ],
      content,
      onUpdate: ({ editor }) => onChangeRef.current?.(editor.getHTML()),
      onBlur: ({ event }) => {
        if (
          document
            .querySelector(".tippy-box")
            ?.contains(event.relatedTarget as Node)
        )
          return;
        // Only trigger onBlur if the click was outside both the editor and menu
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          onBlurRef.current?.();
        }
      },
      editorProps: {
        attributes: {
          class: "outline-none focus:outline-none focus-visible:ring-0",
        },
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            onSubmitRef.current?.();
            return true;
          }
          return false;
        },
      },
      editable: !readOnly,
      injectCSS: false,
    },
    [], // creating the editor only once
  );

  // this will sync external content changes without re-creating the editor instance
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    const safeContent = content ?? "";
    if (safeContent !== currentHTML) {
      editor.commands.setContent(safeContent, false);
    }
  }, [content, editor]);

  // useEditor captures `readOnly` once at creation time (empty deps above), so
  // explicitly sync `editable` when the prop changes. Without this the editor
  // gets stuck read-only when `readOnly` flips from true to false after mount
  // (e.g. card permissions resolving slower than the card data on first load).
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable === !readOnly) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <div ref={containerRef}>
      <style jsx global>{`
        .tiptap p.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap p {
          margin: 0 0 1rem 0 !important;
        }
        .tiptap .mention {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          color: rgb(59, 130, 246);
          text-decoration: none;
          font-weight: 500;
        }
        .tiptap [data-youtube] {
          margin: 1rem 0;
        }
        .tiptap .tableWrapper {
          overflow-x: auto;
        }
        .tiptap td,
        .tiptap th {
          position: relative;
          vertical-align: top;
        }
        .tiptap td p,
        .tiptap th p {
          margin: 0 !important;
        }
        .tiptap .selectedCell {
          background-color: rgba(59, 130, 246, 0.15);
        }
        .tiptap .column-resize-handle {
          position: absolute;
          top: 0;
          right: -2px;
          bottom: 0;
          width: 4px;
          background-color: rgb(59, 130, 246);
          pointer-events: none;
        }
        .tiptap.resize-cursor {
          cursor: col-resize;
        }
      `}</style>
      {!readOnly && editor && <EditorBubbleMenu editor={editor} />}
      {!readOnly && editor && isDocument && <TableBubbleMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className={
          isDocument
            ? "prose max-w-none dark:prose-invert [&_.tiptap]:min-h-[50vh] [&_p.is-empty::before]:text-light-900 [&_p.is-empty::before]:dark:text-dark-800 [&_p]:text-[15px] [&_p]:text-light-1000 [&_p]:dark:text-dark-1000 [&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-light-400 [&_td]:!p-2.5 [&_td]:dark:border-dark-500 [&_th]:border [&_th]:border-light-400 [&_th]:bg-light-200 [&_th]:!p-2.5 [&_th]:text-left [&_th]:dark:border-dark-500 [&_th]:dark:bg-dark-200"
            : "prose dark:prose-invert prose-sm max-w-none overflow-y-auto [&_blockquote]:!text-xs [&_h1]:!text-lg [&_h2]:!text-base [&_h3]:!text-sm [&_ol]:!text-xs [&_p.is-empty::before]:text-light-900 [&_p.is-empty::before]:dark:text-dark-800 [&_p]:!text-sm [&_p]:text-light-950 [&_p]:dark:text-dark-950 [&_ul]:!text-xs"
        }
      />
    </div>
  );
}

function TableBubbleMenu({ editor }: { editor: TiptapEditor }) {
  const tableMenuItems = [
    {
      title: t`Add row`,
      icon: <TbRowInsertBottom />,
      onClick: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      title: t`Add column`,
      icon: <TbColumnInsertRight />,
      onClick: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      title: t`Delete row`,
      icon: <TbRowRemove />,
      onClick: () => editor.chain().focus().deleteRow().run(),
    },
    {
      title: t`Delete column`,
      icon: <TbColumnRemove />,
      onClick: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      title: t`Delete table`,
      icon: <TbTableOff />,
      onClick: () => editor.chain().focus().deleteTable().run(),
    },
  ];

  // Anchored to the table rather than the cursor so it never covers the cell
  // being edited or the text formatting menu.
  const getTableRect = () => {
    const { node } = editor.view.domAtPos(editor.state.selection.from);
    const element = node instanceof Element ? node : node.parentElement;
    return (element?.closest("table") ?? editor.view.dom).getBoundingClientRect();
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={({ editor }) => editor.isActive("table")}
      tippyOptions={{
        getReferenceClientRect: getTableRect,
        placement: "top-end",
      }}
    >
      <div className="flex items-center gap-1 rounded-md border border-light-600 bg-light-50 p-1 dark:border-dark-600 dark:bg-dark-50">
        {tableMenuItems.map((item) => (
          <Button
            key={item.title}
            className="rounded p-1 text-light-900 hover:bg-light-200 focus:ring-2 focus:ring-light-600 dark:text-dark-900 dark:hover:bg-dark-300 dark:focus:ring-dark-600"
            title={item.title}
            aria-label={item.title}
            onClick={item.onClick}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}

function EditorBubbleMenu({ editor }: { editor: TiptapEditor | null }) {
  const isMac = navigator.platform.includes("Mac");

  const bubbleMenuItems = [
    {
      title: "Bold",
      icon: <HiOutlineBold />,
      keys: ["meta", "b"],
      onClick: () => editor?.chain().focus().toggleBold().run(),
      active: editor?.isActive("bold"),
    },
    {
      title: "Italic",
      icon: <HiOutlineItalic />,
      keys: ["meta", "i"],
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      active: editor?.isActive("italic"),
    },
    {
      title: "Strikethrough",
      icon: <HiOutlineStrikethrough />,
      keys: ["meta", "shift", "s"],
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      active: editor?.isActive("strike"),
    },
    {
      title: "Code",
      icon: <HiOutlineCodeBracket />,
      keys: ["meta", "e"],
      onClick: () => editor?.chain().focus().toggleCode().run(),
      active: editor?.isActive("code"),
    },
  ];
  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-2 rounded-md border border-light-600 bg-light-50 p-1 dark:border-dark-600 dark:bg-dark-50">
        {bubbleMenuItems.map((item) => (
          <Button
            key={item.title}
            className={twMerge(
              "rounded p-1 text-light-900 focus:ring-2 focus:ring-light-600 dark:text-dark-900 dark:focus:ring-dark-600",
              item.active && "bg-light-100 dark:bg-dark-400",
            )}
            title={`${item.title} [${item.keys.join(" + ").replace("meta", isMac ? "⌘" : "ctrl")}]`}
            onClick={item.onClick}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                item.onClick();
              }
            }}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}
