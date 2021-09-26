# Some configurations

1. I bootstraped the account and region for cdk

2. Created a github repo where the amplify app will be hosted

3. Created a new github token with the repo and admin:repo_hook permissions

4. Save that token in secret manager as a plaintext secret, save it with the name "github-token"

# When installing and running the CDK project for the first time

When installing the CDK project this is important to have in mind
https://github.com/aws/aws-cdk/issues/13666

```
$ npx npm@6 install
```

Also you might need to bootstrap this environment for the first run

$ cdk bootstrap
