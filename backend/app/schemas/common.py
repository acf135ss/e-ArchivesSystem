from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """通用分页返回结构。"""

    items: list[T]
    total: int
    page: int
    page_size: int
