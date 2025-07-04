import logging
import time
import functools
from typing import Any, Callable
from datetime import datetime


class PerformanceLogger:
    """Logger for tracking performance metrics"""
    
    def __init__(self, logger_name: str = "performance"):
        self.logger = logging.getLogger(logger_name)
        self.logger.setLevel(logging.INFO)
        
        # Create console handler if not already exists
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def log_operation(self, operation: str, duration: float, **kwargs):
        """Log an operation with its duration and additional metadata"""
        extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items()])
        message = f"Operation: {operation} | Duration: {duration:.3f}s"
        if extra_info:
            message += f" | {extra_info}"
        self.logger.info(message)
    
    def log_error(self, operation: str, error: Exception, **kwargs):
        """Log an error during an operation"""
        extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items()])
        message = f"Error in {operation}: {str(error)}"
        if extra_info:
            message += f" | {extra_info}"
        self.logger.error(message)


def performance_monitor(operation_name: str = None):
    """Decorator to monitor function performance"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            logger = PerformanceLogger()
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.log_operation(op_name, duration, status="success")
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.log_error(op_name, e, duration=duration)
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            logger = PerformanceLogger()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.log_operation(op_name, duration, status="success")
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.log_error(op_name, e, duration=duration)
                raise
        
        # Return appropriate wrapper based on whether function is async
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:  # CO_COROUTINE
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class CacheManager:
    """Simple in-memory cache for expensive operations"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self._cache = {}
        self._timestamps = {}
        self.default_ttl = default_ttl
        self.logger = logging.getLogger("cache")
    
    def _is_expired(self, key: str, ttl: int) -> bool:
        """Check if cache entry is expired"""
        if key not in self._timestamps:
            return True
        return time.time() - self._timestamps[key] > ttl
    
    def get(self, key: str, ttl: int = None) -> Any:
        """Get value from cache"""
        ttl = ttl or self.default_ttl
        
        if key in self._cache and not self._is_expired(key, ttl):
            self.logger.debug(f"Cache hit for key: {key}")
            return self._cache[key]
        
        self.logger.debug(f"Cache miss for key: {key}")
        return None
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache"""
        self._cache[key] = value
        self._timestamps[key] = time.time()
        self.logger.debug(f"Cache set for key: {key}")
    
    def delete(self, key: str) -> None:
        """Delete value from cache"""
        if key in self._cache:
            del self._cache[key]
            del self._timestamps[key]
            self.logger.debug(f"Cache deleted for key: {key}")
    
    def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()
        self._timestamps.clear()
        self.logger.info("Cache cleared")


def cached(ttl: int = 300, key_func: Callable = None):
    """Decorator for caching function results"""
    cache = CacheManager()
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__module__}.{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key, ttl)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result)
            return result
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__module__}.{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key, ttl)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result)
            return result
        
        # Return appropriate wrapper based on whether function is async
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:  # CO_COROUTINE
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def setup_logging(log_level: str = "INFO"):
    """Setup application-wide logging configuration"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('app.log')
        ]
    )
    
    # Create specific loggers for different components
    loggers = ['performance', 'cache', 'database', 'agents', 'api']
    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, log_level.upper()))