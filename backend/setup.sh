#!/bin/bash
# backend/setup.sh

echo "Creating virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing dependencies..."
pip install -r requirements.txt

echo "✅ Backend setup complete!"
echo "Run the backend with:"
echo "source venv/bin/activate && uvicorn main:app --reload"