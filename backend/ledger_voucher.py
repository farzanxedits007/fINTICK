from decimal import Decimal

from django.utils import timezone

DEFAULT_RATE = Decimal('75.75')


def compute_pkr_amount(currency, amount, amount_sar, exchange_rate):
    currency = (currency or 'PKR').upper()
    if currency == 'SAR':
        rate = Decimal(str(exchange_rate or DEFAULT_RATE))
        return (Decimal(str(amount_sar)) * rate).quantize(Decimal('0.01'))
    return Decimal(str(amount))


def voucher_no_for(entry):
    created = entry.created_at or timezone.now()
    return f"VCH-{created:%y%m%d}-{entry.id.hex[:6].upper()}"


def post_money(payment_method, direction, amount, description, reference_model, reference_id, account_id=None):
    if payment_method == 'cash':
        from cash import services as cash_services
        if direction == 'in':
            cash_services.deposit(amount, description, reference_model, reference_id)
        else:
            cash_services.withdraw(amount, description, reference_model, reference_id)
    else:
        from bank import services as bank_services
        if direction == 'in':
            bank_services.deposit(amount, description, reference_model, reference_id, account_id=account_id)
        else:
            bank_services.withdraw(amount, description, reference_model, reference_id, account_id=account_id)


def reverse_money(payment_method, reference_model, reference_id):
    if payment_method == 'cash':
        from cash import services as cash_services
        cash_services.reverse_by_reference(reference_model, reference_id)
    else:
        from bank import services as bank_services
        bank_services.reverse_by_reference(reference_model, reference_id)
