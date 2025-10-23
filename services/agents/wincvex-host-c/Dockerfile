FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY agent.py ./
ENV PYTHONUNBUFFERED=1
EXPOSE 8500
CMD ["uvicorn", "agent:app", "--host", "0.0.0.0", "--port", "8500"]