from typing import Any, Dict, Optional, TypeVar
from django.db import models

ModelT = TypeVar('ModelT', bound=models.Model)


class BaseService:
    model: models.Model = None

    def __init__(self, user=None, company=None):
        self.user = user
        self.company = company


class BaseSelector:
    model: models.Model = None

    def __init__(self, user=None, company=None):
        self.user = user
        self.company = company

    def get_queryset(self):
        return self.model.objects_all.all() if self.user and getattr(self.user, 'role', '') == 'super_admin' else self.model.objects.all()


class BaseRepository:
    model: models.Model = None

    def get(self, **filters):
        return self.model.objects.get(**filters)

    def filter(self, **filters):
        return self.model.objects.filter(**filters)

    def create(self, **kwargs):
        return self.model.objects.create(**kwargs)

    def update(self, instance, **kwargs):
        for attr, value in kwargs.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def delete(self, instance):
        instance.delete()
