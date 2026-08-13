from .models import CashAccount, CashTransaction


def get_cash_account():
    account, _ = CashAccount.objects.get_or_create(name='Cash Account')
    return account


def deposit(amount, description, reference_model='', reference_id=None):
    account = get_cash_account()
    account.balance += amount
    account.save(update_fields=['balance'])
    return CashTransaction.objects.create(
        account=account,
        tx_type=CashTransaction.TxType.DEPOSIT,
        amount_pkr=amount,
        description=description,
        reference_model=reference_model,
        reference_id=reference_id,
        balance_after=account.balance,
    )


def withdraw(amount, description, reference_model='', reference_id=None):
    account = get_cash_account()
    account.balance -= amount
    account.save(update_fields=['balance'])
    return CashTransaction.objects.create(
        account=account,
        tx_type=CashTransaction.TxType.WITHDRAWAL,
        amount_pkr=amount,
        description=description,
        reference_model=reference_model,
        reference_id=reference_id,
        balance_after=account.balance,
    )


def reverse_transaction(tx_id):
    try:
        tx = CashTransaction.objects.get(pk=tx_id)
    except CashTransaction.DoesNotExist:
        return
    account = tx.account
    if tx.tx_type == CashTransaction.TxType.DEPOSIT:
        account.balance -= tx.amount_pkr
    else:
        account.balance += tx.amount_pkr
    account.save(update_fields=['balance'])
    tx.delete()


def reverse_by_reference(reference_model, reference_id):
    try:
        tx = CashTransaction.objects.get(reference_model=reference_model, reference_id=reference_id)
    except CashTransaction.DoesNotExist:
        return
    reverse_transaction(tx.id)
