<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Keep calendar filters in client-side React state and race records in the index route; entries without official confirmation must be visibly labelled provisional with approximate month windows, never exact days; this initial calendar has no persistence or authentication.
- Keep page copy and filter options in the index route and route-specific metadata in its head function; root metadata supplies sitewide defaults only.
