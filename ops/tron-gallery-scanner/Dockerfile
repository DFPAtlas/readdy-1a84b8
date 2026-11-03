FROM python:3.11-slim
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.4.1 \
 && pip install --no-cache-dir transformers==4.44.2 pillow==10.4.0 requests==2.32.3
RUN useradd --create-home --uid 10001 app
USER app
WORKDIR /home/app
COPY --chown=app worker.py .
ENV PYTHONUNBUFFERED=1 HF_HOME=/home/app/.cache/huggingface
CMD ["python", "worker.py"]
