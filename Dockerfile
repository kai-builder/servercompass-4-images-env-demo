# Generic Dockerfile - Please customize for your framework
FROM ubuntu:22.04
WORKDIR /app
RUN apt-get update && apt-get install -y curl wget && rm -rf /var/lib/apt/lists/*
COPY . .
ENV PORT=8081
EXPOSE 8081
# TODO: Add your start command
CMD ["echo", "Please configure your start command"]
