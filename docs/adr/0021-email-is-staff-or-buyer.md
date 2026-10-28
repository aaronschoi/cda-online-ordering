# An email belongs to Staff or to a Buyer

Superseded in part by ADR 0025 and ADR 0026. Only a Manager has an email. A Staff member who is not a Manager has no email. A Buyer still signs in with a code sent to the Square Customer email. A code to a Manager's email is refused.

## Considered options

Letting one email sign in as either Staff or a Buyer. Rejected. The sign-in screen would not know which account it is.
