# The Staff list decides after the first Manager

The configured email creates the first Manager only when none exists. After that, the Staff list decides who can open the pages. Removing a Manager, other than the last, drops that email. The configured email does not add them back. A PIN that belongs to nobody leaves the current Staff member acting.

## Considered options

- Letting the configured email open the pages after that person was removed. Rejected. The Staff list is the source.
- Clearing who is acting when a PIN matches nobody. Rejected.
