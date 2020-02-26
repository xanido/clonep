# clonep

`git clone`, in parallel!

Usage:

```bash
clonep -p <parallelism> -r <comma separated list of repos>
```

You can also pipe it a list of repos, e.g:

```bash
$ cat << EOF > repos.txt
sindresorhus/np
sindresorhus/log-update
sindresorhus/awesome
sindresorhus/query-string
sindresorhus/conf
sindresorhus/camelcase-keys
sindresorhus/emoj
sindresorhus/slugify
sindresorhus/file-type
sindresorhus/ow
EOF

$ cat repos.txt | clonep -p 10
```
