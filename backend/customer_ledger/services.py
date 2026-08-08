from .models import CustomerLedgerEntry


def post_to_customer_ledger(ticket):
    CustomerLedgerEntry.objects.create(
        ticket=ticket,
        customer=ticket.customer,
        passenger_name=ticket.passenger_name,
        entry_type=CustomerLedgerEntry.EntryType.DEBIT,
        amount_pkr=ticket.ticket_price_pkr,
        description=f'Ticket price for {ticket.passenger_name} (PNR: {ticket.pnr})',
        status=CustomerLedgerEntry.Status.OUTSTANDING,
    )
