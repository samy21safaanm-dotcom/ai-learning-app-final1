# Migration 60s Card (Hackathon)

## الهدف
- نقل الترافيك إلى السيرفر الجديد خلال 10-15 دقيقة مع قرار Go/No-Go واضح.

## Pre-Flight (قبل العرض بـ 30 دقيقة)
1. افتح جلستين SSH: قديم + جديد.
2. جهّز المتغيرات محليًا:
```bash
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=<bucket>
export DB_HOST=<rds-endpoint>
export PUBLIC_BASE_URL=http://<NEW_IP>
```
3. تأكد أن الدومين TTL = 60s.

## Minute-by-Minute
1. Min 0-6: نشر على الجديد
```bash
bash scripts/first-deploy.sh <NEW_IP> <KEY.pem>
```
2. Checkpoint A
```bash
curl -s http://<NEW_IP>/health
curl -s http://<NEW_IP>/media-provider-status
```
Go إذا: health = healthy أو degraded + JSON صحيح.

3. Min 6-10: Smoke Test على الجديد
- Login
- Upload
- Generate Lesson
Go إذا: التجربة كاملة تعمل.

4. Min 10-12: تحويل الترافيك
- DNS/Target Group -> NEW
- انتظر 1-3 دقائق

5. Checkpoint C (قبل الصعود للمسرح)
```bash
curl -I http://<DOMAIN>
curl -s http://<DOMAIN>/health
```
Go إذا: الدومين يرد + health مقبول.

## No-Go / Rollback (2-3 دقائق)
1. DNS/Target Group -> OLD فورًا.
2. تحقق:
```bash
curl -s http://<DOMAIN>/health
```
3. أكمل العرض على القديم.

## جملة القرار (لقائد العملية)
- Go: "A/B/C كلها خضراء، نحول الآن".
- No-Go: "نرجع للقديم فورًا ونكمل العرض".
