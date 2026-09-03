from collections import defaultdict

from app.main import app


def _route_key(route):
    methods = getattr(route, "methods", set())
    path = getattr(route, "path", None)
    return [(method, path) for method in methods if method not in {"HEAD", "OPTIONS"}]


def test_registered_routes_do_not_duplicate_method_and_path():
    registry = defaultdict(list)
    for route in app.routes:
        for key in _route_key(route):
            registry[key].append(route)

    duplicates = {key: routes for key, routes in registry.items() if len(routes) > 1}
    assert not duplicates, "Rotas duplicadas: " + ", ".join(f"{method} {path}" for method, path in duplicates)


def test_openapi_paths_have_unique_operations():
    operations = []
    for path, item in app.openapi()["paths"].items():
        operations.extend((method.upper(), path) for method in item if method in {"get", "post", "put", "patch", "delete"})
    assert len(operations) == len(set(operations))
