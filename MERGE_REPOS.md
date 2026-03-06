# Merging frontend + backend into one repo (keeping full history)

You have two git repos: `backend/` and `frontend/`. This merges them into a **single repo** at the project root, with both living in `backend/` and `frontend/` subdirectories and **all commit history preserved** (via `git subtree`).

## Steps (run from project root)

### 1. Backup current repos (so we can subtree-add them)

```bash
mv backend _backend_repo
mv frontend _frontend_repo
```

### 2. Create the new combined repo

```bash
git init
```

### 3. Commit root-level files first (optional but recommended)

```bash
git add .env README.md docker-compose.yml .claude
git commit -m "chore: root config and docs"
```

(Skip any of these if you don’t want them in git, e.g. `.env`.)

### 4. Bring in backend with full history

```bash
git subtree add --prefix=backend _backend_repo main
```

### 5. Bring in frontend with full history

```bash
git subtree add --prefix=frontend _frontend_repo main
```

### 6. Remove the temporary repo folders

```bash
rm -rf _backend_repo _frontend_repo
```

### 7. Add a remote and push (if you use a single remote)

```bash
git remote add origin <your-new-repo-url>
git push -u origin main
```

---

## Result

- One repo at the project root.
- `backend/` and `frontend/` are normal directories with full history.
- `git log backend/` and `git log frontend/` show their original commits; `git log --all` shows everything.

## If your default branch is `master` instead of `main`

Replace `main` with `master` in the `git subtree add` commands above.

## Optional: add root files after both subtrees

If you prefer the first commit to be the merge of both projects, you can:

1. Do step 1 (rename to `_backend_repo` / `_frontend_repo`).
2. `git init`.
3. Run both `git subtree add` (steps 4 and 5).
4. Then add root files (`.env`, `README.md`, `docker-compose.yml`, etc.) and commit.
5. Remove `_backend_repo` and `_frontend_repo` (step 6).
