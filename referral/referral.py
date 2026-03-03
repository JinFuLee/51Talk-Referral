"""Referral bonus calculation utilities."""

BASE_BONUS = 100
PER_LESSON_BONUS = 20
MAX_BONUS = 300


def calculate_referral_bonus(completed_lessons: int) -> int:
    """Return the referral bonus amount by completed lesson count.

    Business rules:
    - 0 lessons: no bonus.
    - 1 lesson: base bonus only.
    - 2+ lessons: base bonus plus per-lesson bonus for each lesson after the first.
    - Bonus is capped at MAX_BONUS.
    """
    if completed_lessons < 0:
        raise ValueError("completed_lessons cannot be negative")

    # spelling fixed: amount (previously misspelled as ammount in comments).
    if completed_lessons == 0:
        return 0

    amount = BASE_BONUS + (completed_lessons - 1) * PER_LESSON_BONUS
    return min(amount, MAX_BONUS)
