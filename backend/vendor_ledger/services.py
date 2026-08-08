from .models import VendorLedgerEntry


def post_to_vendor_ledger(ticket):
    VendorLedgerEntry.objects.create(
        ticket=ticket,
        vendor=ticket.vendor,
        passenger_name=ticket.passenger_name,
        entry_type=VendorLedgerEntry.EntryType.CREDIT,
        amount_pkr=ticket.vendor_cost_pkr,
        description=f'Vendor cost for {ticket.passenger_name} (PNR: {ticket.pnr})',
        status=VendorLedgerEntry.Status.OUTSTANDING,
    )
