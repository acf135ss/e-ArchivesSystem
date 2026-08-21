from pydantic import BaseModel


class CategoryCount(BaseModel):
    category_id: int
    category_name: str
    count: int


class DashboardStats(BaseModel):
    total_archives: int
    expiring_count: int
    expired_count: int
    attachment_count: int
    category_distribution: list[CategoryCount]
