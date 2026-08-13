from .models import BankAccount, BankTransaction


def get_account():
    account, _ = BankAccount.objects.get_or_create(name='Main Account')
    return account


def deposit(amount, description, reference_model='', reference_id=None, account_id=None):
    account = BankAccount.objects.get(pk=account_id) if account_id else get_account()
    account.balance += amount
    account.save(update_fields=['balance'])
    return BankTransaction.objects.create(
        account=account,
        tx_type=BankTransaction.TxType.DEPOSIT,
        amount_pkr=amount,
        description=description,
        reference_model=reference_model,
        reference_id=reference_id,
        balance_after=account.balance,
    )


def withdraw(amount, description, reference_model='', reference_id=None, account_id=None):
    account = BankAccount.objects.get(pk=account_id) if account_id else get_account()
    account.balance -= amount
    account.save(update_fields=['balance'])
    return BankTransaction.objects.create(
        account=account,
        tx_type=BankTransaction.TxType.WITHDRAWAL,
        amount_pkr=amount,
        description=description,
        reference_model=reference_model,
        reference_id=reference_id,
        balance_after=account.balance,
    )


def reverse_transaction(tx_id):
    try:
        tx = BankTransaction.objects.get(pk=tx_id)
    except BankTransaction.DoesNotExist:
        return
    account = tx.account
    if tx.tx_type == BankTransaction.TxType.DEPOSIT:
        account.balance -= tx.amount_pkr
    else:
        account.balance += tx.amount_pkr
    account.save(update_fields=['balance'])
    tx.delete()


def reverse_by_reference(reference_model, reference_id):
    try:
        tx = BankTransaction.objects.get(reference_model=reference_model, reference_id=reference_id)
    except BankTransaction.DoesNotExist:
        return
    reverse_transaction(tx.id)
