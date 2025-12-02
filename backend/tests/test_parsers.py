"""
Tests unitarios para utils/parsers.py
"""
import pytest
from datetime import date, time, datetime
from utils.parsers import parse_date, parse_time


class TestParseDate:
    """Tests para la función parse_date"""
    
    def test_parse_date_from_string(self):
        """Debe convertir string YYYY-MM-DD a date"""
        result = parse_date("2025-11-30")
        assert result == date(2025, 11, 30)
    
    def test_parse_date_returns_existing_date(self):
        """Debe devolver el objeto date sin modificar"""
        original = date(2025, 11, 30)
        result = parse_date(original)
        assert result == original
        assert result is original
    
    def test_parse_date_from_datetime(self):
        """Debe extraer date de un datetime"""
        dt = datetime(2025, 11, 30, 14, 30, 0)
        result = parse_date(dt)
        assert result == date(2025, 11, 30)
    
    def test_parse_date_none_returns_none(self):
        """Debe devolver None si se pasa None"""
        assert parse_date(None) is None
    
    def test_parse_date_empty_string_returns_none(self):
        """Debe devolver None si se pasa string vacío"""
        assert parse_date("") is None
    
    def test_parse_date_invalid_format_returns_none(self):
        """Debe devolver None si el formato es inválido"""
        assert parse_date("30/11/2025") is None
        assert parse_date("invalid") is None
        assert parse_date("2025-13-40") is None


class TestParseTime:
    """Tests para la función parse_time"""
    
    def test_parse_time_from_string_hms(self):
        """Debe convertir string HH:MM:SS a time"""
        result = parse_time("14:30:45")
        assert result == time(14, 30, 45)
    
    def test_parse_time_from_string_hm(self):
        """Debe convertir string HH:MM a time"""
        result = parse_time("14:30")
        assert result == time(14, 30, 0)
    
    def test_parse_time_returns_existing_time(self):
        """Debe devolver el objeto time sin modificar"""
        original = time(14, 30, 45)
        result = parse_time(original)
        assert result == original
        assert result is original
    
    def test_parse_time_none_returns_none(self):
        """Debe devolver None si se pasa None"""
        assert parse_time(None) is None
    
    def test_parse_time_empty_string_returns_none(self):
        """Debe devolver None si se pasa string vacío"""
        assert parse_time("") is None
    
    def test_parse_time_invalid_format_returns_none(self):
        """Debe devolver None si el formato es inválido"""
        assert parse_time("invalid") is None
        assert parse_time("25:00:00") is None
        assert parse_time("14:60:00") is None
