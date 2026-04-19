# Remotion Lambda Setup

This app renders MP4s on **Remotion Lambda** (your AWS account). One-time setup
takes ~15 min and ~$0.01/reel after AWS free tier.

## 1. AWS account + IAM user

1. Create an [AWS account](https://aws.amazon.com/) if you don't have one.
2. Open the [IAM console](https://console.aws.amazon.com/iam) → **Users** → **Create user**.
3. Name it `remotion-lambda-user`.
4. **Attach policies directly** → **Create policy** → JSON tab. Paste the policy
   from [Remotion's docs](https://www.remotion.dev/docs/lambda/permissions)
   (the "user policy"). Save as `remotion-lambda-policy`.
5. Back on the user, attach `remotion-lambda-policy`.
6. After creation, open the user → **Security credentials** → **Create access key**
   → **Application running outside AWS**. Save the **Access key ID** and
   **Secret access key** — you'll paste these into Lovable in step 4.

## 2. Deploy the Lambda function (run locally on your machine, once)

```bash
# clone or `git pull` your project locally first
npm install
npx remotion lambda functions deploy
```

Output looks like:
```
Function name: remotion-render-4-0-XXX-mem2048mb-disk2048mb-120sec
```

Save this **function name** for step 4.

## 3. Deploy the Remotion site (run locally; re-run after design changes)

```bash
npx remotion lambda sites create src/remotion/index.ts --site-name=quran-reel
```

Output looks like:
```
Serve URL: https://remotionlambda-useast1-XXXX.s3.us-east-1.amazonaws.com/sites/quran-reel/index.html
```

Save this **serve URL** for step 4.

> Re-run this command whenever you change anything in `src/remotion/`.

## 4. Paste secrets into Lovable

In Lovable Cloud secrets, add:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | from step 1 |
| `AWS_SECRET_ACCESS_KEY` | from step 1 |
| `REMOTION_AWS_REGION` | the region you deployed to, e.g. `us-east-1` |
| `REMOTION_FUNCTION_NAME` | from step 2 |
| `REMOTION_SERVE_URL` | from step 3 |

That's it. Hit **Render MP4** in the studio and you're producing real 1080×1920
H.264 MP4s on Lambda.

## Costs

- AWS free tier covers ~100 short reels/month
- After that: ~$0.005–0.02 per reel depending on length
- Storage of rendered MP4s in your Remotion S3 bucket is essentially free
