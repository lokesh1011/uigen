"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FilePlus,
  FileCode,
  FileX,
  FilePen,
  MoveRight,
  Eye,
  Undo2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StrReplaceEditorArgs {
  command?: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path?: string;
  file_text?: string;
  old_str?: string;
  new_str?: string;
  insert_line?: number;
  view_range?: [number, number];
}

interface FileManagerArgs {
  command?: "rename" | "delete";
  path?: string;
  new_path?: string;
}

interface ToolInvocationLike {
  toolCallId: string;
  toolName: string;
  state: "partial-call" | "call" | "result";
  args: StrReplaceEditorArgs | FileManagerArgs;
  result?: string | { success: boolean; message?: string; error?: string };
}

interface ToolInvocationDisplayProps {
  tool: ToolInvocationLike;
}

interface OperationMeta {
  label: string;
  Icon: React.ElementType;
}

function getOperationMeta(tool: ToolInvocationLike): OperationMeta {
  const args = tool.args as StrReplaceEditorArgs & FileManagerArgs;

  if (tool.toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":     return { label: "Creating file",   Icon: FilePlus };
      case "str_replace": return { label: "Editing file",   Icon: FilePen };
      case "insert":     return { label: "Inserting lines", Icon: FilePen };
      case "view":       return { label: "Reading file",    Icon: Eye };
      case "undo_edit":  return { label: "Undoing edit",    Icon: Undo2 };
      default:           return { label: "File operation",  Icon: FileCode };
    }
  }

  if (tool.toolName === "file_manager") {
    switch (args.command) {
      case "rename": return { label: "Renaming",      Icon: MoveRight };
      case "delete": return { label: "Deleting file", Icon: FileX };
      default:       return { label: "File operation", Icon: FileCode };
    }
  }

  return { label: "File operation", Icon: FileCode };
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen) + "…";
}

const DIFF_INLINE_THRESHOLD = 200;
const DIFF_LINE_MAX = 80;

function FileBadge({ path }: { path: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-600 bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 max-w-[220px] truncate"
      title={path}
    >
      <FileCode className="w-3 h-3 shrink-0 text-neutral-400" />
      {basename(path)}
    </span>
  );
}

function DiffBlock({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const isLong = oldStr.length > DIFF_INLINE_THRESHOLD || newStr.length > DIFF_INLINE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);

  const oldLines = oldStr.split("\n").map((l) => truncate(l, DIFF_LINE_MAX));
  const newLines = newStr.split("\n").map((l) => truncate(l, DIFF_LINE_MAX));

  return (
    <div className="mt-2 w-full">
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-700 transition-colors mb-1"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? "Hide diff" : "Show diff"}
        </button>
      )}
      {expanded && (
        <div className="rounded border border-neutral-200 overflow-hidden text-[11px] font-mono leading-relaxed">
          {oldLines.map((line, i) => (
            <div key={`old-${i}`} className="flex gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 whitespace-pre-wrap break-all">
              <span className="shrink-0 select-none text-red-400">−</span>
              <span>{line}</span>
            </div>
          ))}
          {newLines.map((line, i) => (
            <div key={`new-${i}`} className="flex gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 whitespace-pre-wrap break-all">
              <span className="shrink-0 select-none text-emerald-500">+</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StateIndicator({ state, isError }: { state: ToolInvocationLike["state"]; isError: boolean }) {
  if (isError) return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  if (state === "result") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />;
}

function isErrorResult(result: ToolInvocationLike["result"]): boolean {
  if (!result) return false;
  if (typeof result === "object" && "success" in result) return result.success === false;
  if (typeof result === "string" && result.startsWith("Error")) return true;
  return false;
}

function getErrorMessage(result: ToolInvocationLike["result"]): string | null {
  if (!result) return null;
  if (typeof result === "object" && !result.success) return result.error ?? "Unknown error";
  if (typeof result === "string" && result.startsWith("Error")) return truncate(result, 120);
  return null;
}

export function ToolInvocationDisplay({ tool }: ToolInvocationDisplayProps) {
  const { label, Icon } = getOperationMeta(tool);
  const isDone = tool.state === "result";
  const isError = isDone && isErrorResult(tool.result);
  const errorMessage = isError ? getErrorMessage(tool.result) : null;

  const args = tool.args as StrReplaceEditorArgs & FileManagerArgs;

  const showDiff =
    tool.toolName === "str_replace_editor" &&
    args.command === "str_replace" &&
    typeof args.old_str === "string" &&
    typeof args.new_str === "string";

  const showRename =
    tool.toolName === "file_manager" &&
    args.command === "rename" &&
    typeof args.new_path === "string";

  return (
    <div
      className={cn(
        "mt-2 px-3 py-2 rounded-lg border text-xs font-mono w-full",
        isError ? "bg-red-50 border-red-200" : "bg-neutral-50 border-neutral-200"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <StateIndicator state={tool.state} isError={isError} />
        <div className="flex items-center gap-1.5 text-neutral-700 shrink-0">
          <Icon className="w-3 h-3 text-neutral-500" />
          <span>{label}</span>
        </div>
        {!showRename && args.path && <FileBadge path={args.path} />}
      </div>

      {showRename && (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <FileBadge path={args.path!} />
          <MoveRight className="w-3 h-3 text-neutral-400 shrink-0" />
          <FileBadge path={args.new_path!} />
        </div>
      )}

      {showDiff && <DiffBlock oldStr={args.old_str!} newStr={args.new_str!} />}

      {isError && errorMessage && (
        <p className="mt-1.5 text-red-600 text-[11px] break-words">{errorMessage}</p>
      )}
    </div>
  );
}
