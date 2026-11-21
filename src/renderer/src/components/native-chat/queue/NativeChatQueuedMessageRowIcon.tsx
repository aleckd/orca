import { AlertCircle, ListEnd } from 'lucide-react'
import { cn } from '@/lib/class-names'

/** The row's leading glyph, which a drag grip replaces on hover: red for a row that needs the
 *  person. On a narrow failed row the red icon moves next to Retry, so the lead shows the plain one. */
export function NativeChatQueuedMessageRowIcon({
  attention,
  failureMovesToCaption,
  expanded,
  grip
}: {
  attention: boolean
  failureMovesToCaption: boolean
  expanded: boolean
  grip?: React.ReactNode
}): React.JSX.Element {
  const hidesForGrip =
    grip &&
    'group-hover/queued:opacity-0 group-focus-within/queued:opacity-0 [@media(hover:none)]:opacity-0'
  const plain = (className?: string): React.JSX.Element => (
    <ListEnd
      className={cn('size-3.5 text-muted-foreground', className, hidesForGrip)}
      aria-hidden
    />
  )
  return (
    <span
      className={cn(
        'relative flex size-3.5 shrink-0 items-center justify-center',
        expanded && 'mt-1.5'
      )}
    >
      {attention ? (
        <AlertCircle
          className={cn(
            'size-3.5 text-destructive',
            failureMovesToCaption && '@max-[400px]:hidden',
            hidesForGrip
          )}
          aria-hidden
        />
      ) : (
        plain()
      )}
      {attention && failureMovesToCaption ? plain('hidden @max-[400px]:block') : null}
      {grip}
    </span>
  )
}
