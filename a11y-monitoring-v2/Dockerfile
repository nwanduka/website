FROM grafana/alloy:latest

# Copy config file
COPY alloy-config.alloy /etc/alloy/config.alloy

# Expose ports
EXPOSE 9091 3101

# Run Alloy
CMD ["run", "/etc/alloy/config.alloy"]
