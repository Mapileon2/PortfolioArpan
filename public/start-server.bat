@echo off
echo Starting SaaS Portfolio Admin Dashboard...
echo.
echo Opening browser to http://localhost:8000
echo.
start http://localhost:8000/admin-dashboard-saas-complete.html
python -m http.server 8000