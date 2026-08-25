# Visual design plan: guest-first authentication

- Change: `openspec/changes/guest-first-authentication`
- Status: approved planning record
- Links: [UX record](../ux/guest-first-authentication.md); [copy guidance](../copy/guest-first-authentication.md); [tasks](../tasks.md) task 3.1
- Scope: start/create/join, invitation confirmation, expired-session recovery, and clear/delete guest data.

## Intent and hierarchy

The iPhone-first start screen leads with one immediate action: create a round or join a friend's
round. The selected action reveals the display-name field, browser-only explanation, and primary
submit without introducing account terminology. Invitation joins state the join boundary before
any round information. The data screen separates reversible device clearing from destructive guest
data deletion with an explanatory confirmation for each.

On narrow screens use one full-width task card and one primary action. Wider layouts may place
create and join cards beside each other but retain DOM and keyboard order. No primary action relies
on hover; QR scanning always has a visible paste/copy-link alternative.

## Foundation and state treatment

| Area                                  | Primitive or semantic treatment                                | Required presentation                                                                       |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Start, create, join, and confirmation | `Card`, `TextField`, `Action`                                  | Task heading, named field/help, primary submit, and secondary return path.                  |
| Guest/session explanation             | `StatusMessage` information treatment                          | Plain text that this browser stores the guest session; no account icon or account language. |
| Invalid name/link and denied access   | Inline field error plus assertive `StatusMessage`              | Preserve input where safe and show a specific next action.                                  |
| Busy/expired/offline                  | `StatusMessage` and disabled busy `Action`                     | Keep current context; expired state returns to name entry.                                  |
| Clear device                          | Secondary/destructive-adjacent action with confirmation dialog | Explain that shared records remain but this browser loses access.                           |
| Delete guest data                     | Strong destructive action with confirmation dialog             | State irreversibility and shared-history anonymization.                                     |

Use existing semantic surface, text, border, action, status, spacing, focus, and disabled tokens
and the existing accessible primitives. No new foundation component or token is requested.

## Accessibility and responsive behavior

- Every interactive element is at least 44 by 44 CSS pixels and has the shared visible focus ring.
- Use semantic headings and keep mobile DOM order at all breakpoints. Dialog focus moves to its
  heading or first control, remains contained until dismissal, and returns to the invoking action.
- `TextField` supplies the persistent name label, help, character-limit error, and programmatic
  error association. Status text communicates all state; colour and icon are supplementary.
- WCAG AA contrast applies to information, warning, error, success, secondary, and destructive
  treatments. QR content has an accessible label and text alternative.
