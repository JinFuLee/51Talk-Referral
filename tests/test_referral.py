import pytest

from referral.referral import calculate_referral_bonus


@pytest.mark.parametrize(
    "lessons, expected",
    [
        (0, 0),
        (1, 100),
        (2, 120),
        (3, 140),
        (20, 300),
    ],
)
def test_calculate_referral_bonus(lessons: int, expected: int) -> None:
    assert calculate_referral_bonus(lessons) == expected


def test_calculate_referral_bonus_rejects_negative_lessons() -> None:
    with pytest.raises(ValueError):
        calculate_referral_bonus(-1)
