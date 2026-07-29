from django.db import migrations


def fix_non_super_admin_company(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Company = apps.get_model('companies', 'Company')

    company = Company.objects.first()
    if not company:
        return

    fixed = []
    for u in User.objects.filter(role__in=['admin', 'attendant', 'supervisor'], company__isnull=True):
        u.company = company
        u.save()
        fixed.append(f'{u.username} (role={u.role})')

    if fixed:
        print(f'  Usuários corrigidos: {", ".join(fixed)}')


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_make_email_optional'),
    ]

    operations = [
        migrations.RunPython(fix_non_super_admin_company, migrations.RunPython.noop),
    ]
