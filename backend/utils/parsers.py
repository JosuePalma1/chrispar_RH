from datetime import datetime, date, time


def parse_date(value):
    """Convert a string (YYYY-MM-DD) to date or return the original date."""
    if value is None or value == "":
        return None
    # Check datetime first since datetime is a subclass of date
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def parse_time(value):
    """Convert a string (HH:MM[:SS]) to time or return the original time."""
    if value is None or value == "":
        return None
    if isinstance(value, time):
        return value
    try:
        return datetime.strptime(str(value), "%H:%M:%S").time()
    except (ValueError, TypeError):
        try:
            return datetime.strptime(str(value), "%H:%M").time()
        except (ValueError, TypeError):
            return None
