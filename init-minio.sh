#!/bin/sh

echo "Waiting for MinIO to be ready..."

until wget -q --spider --no-check-certificate https://minio.local:9000/minio/health/ready; do
  sleep 1
done

echo "MinIO is ready. Configuring..."

mc alias set gp_minio https://minio.local:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --insecure

mc admin user info gp_minio "$MINIO_ACCESS_KEY" --insecure > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Creating MinIO user..."
  mc admin user add gp_minio "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --insecure
  mc admin policy attach gp_minio readwrite --user "$MINIO_ACCESS_KEY" --insecure
else
  echo "MinIO user already exists."
fi
