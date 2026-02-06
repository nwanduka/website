FROM grafana/alloy:latest

# Copy config
COPY config.alloy /etc/alloy/config.alloy

# Expose ports for metrics and logs
EXPOSE 9091 3101

# Run Alloy
CMD ["run", "/etc/alloy/config.alloy"]
