# A Manager sees every PIN and the Staff log

A Manager is a Staff member who can open the manager section. Other Staff members cannot. That section lists every Staff member and that person's PIN, so a Manager can read the PIN. It also shows the Staff log.

Confirming, advancing, canceling, approving, denying, and opening or closing a Delivery zip wait until a PIN is entered. The Staff log names the Staff member that PIN belongs to, the action, and the Order. The Order is not assigned to that Staff member.

Cloudflare Access opens the staff pages. The manager section is a second Access check, and only a Manager gets through. A PIN opens neither. On that computer the PIN remains the Staff member acting until a different PIN is entered. Leaving the staff pages clears it.

## Considered options

- Recording the Staff member on the Order. Rejected. The Staff log is the record, and every Staff member still sees the Order.
- Storing the PIN so it cannot be read back. Rejected. A Manager reads the PIN from the list.
- Letting every Staff member see the PIN list and the Staff log. Rejected.
