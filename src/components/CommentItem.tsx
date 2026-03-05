import Image from "next/image";
import type { PostComment } from "@/lib/types";

interface CommentItemProps {
  comment: PostComment;
  onLeadInfo?: (leadId: number) => void;
}

export default function CommentItem({ comment: cm, onLeadInfo }: CommentItemProps) {
  return (
    <div className="flex gap-3">
      {cm.lead_picture ? (
        <Image
          src={cm.lead_picture}
          alt={cm.lead_name}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover shrink-0"
          unoptimized
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
          {cm.lead_name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">
          {cm.lead_name}
        </span>
        {cm.comment_text && (
          <p className="mt-1 text-sm text-muted leading-relaxed">
            {cm.comment_text}
          </p>
        )}
        <div className="mt-1 flex gap-3 text-xs text-muted">
          {cm.commented_at && (
            <span>
              {new Date(cm.commented_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <a
            href={cm.lead_linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            LinkedIn
          </a>
          {cm.comment_url && (
            <a
              href={cm.comment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Comment
            </a>
          )}
          {onLeadInfo && (
            <button
              onClick={() => onLeadInfo(cm.lead_id)}
              className="text-purple-400 hover:underline"
            >
              Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
