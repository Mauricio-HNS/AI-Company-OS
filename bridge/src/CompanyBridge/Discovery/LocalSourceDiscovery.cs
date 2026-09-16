namespace CompanyBridge.Discovery;

public sealed record LocalSourceDescriptor(
    string Id,
    string Kind,
    string Location,
    string[] Capabilities,
    bool RequiresAuthorization,
    bool ReadOnly,
    long? SizeBytes,
    DateTimeOffset DiscoveredAt);

public sealed class LocalSourceDiscovery
{
    private static readonly string[] BusinessExtensions =
    {
        ".csv", ".xlsx", ".xls", ".json", ".xml", ".pdf", ".db", ".sqlite", ".sqlite3"
    };

    public Task<IReadOnlyCollection<LocalSourceDescriptor>> DiscoverAsync(
        IEnumerable<string> roots,
        CancellationToken cancellationToken)
    {
        var results = new List<LocalSourceDescriptor>();

        foreach (var root in roots.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!Directory.Exists(root))
                continue;

            results.Add(new LocalSourceDescriptor(
                $"directory:{root}",
                "directory",
                root,
                new[] { "enumerate-authorized-files" },
                true,
                true,
                null,
                DateTimeOffset.UtcNow));

            foreach (var file in EnumerateFilesSafely(root, cancellationToken))
            {
                cancellationToken.ThrowIfCancellationRequested();
                var extension = Path.GetExtension(file);
                if (!BusinessExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                    continue;

                long? size = null;
                try { size = new FileInfo(file).Length; } catch { }

                results.Add(new LocalSourceDescriptor(
                    $"file:{file}",
                    Classify(extension),
                    file,
                    new[] { "metadata", "schema-candidate" },
                    true,
                    true,
                    size,
                    DateTimeOffset.UtcNow));
            }
        }

        return Task.FromResult<IReadOnlyCollection<LocalSourceDescriptor>>(results);
    }

    private static IEnumerable<string> EnumerateFilesSafely(string root, CancellationToken cancellationToken)
    {
        var pending = new Stack<string>();
        pending.Push(root);

        while (pending.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var current = pending.Pop();

            string[] directories;
            try { directories = Directory.GetDirectories(current); } catch { continue; }
            foreach (var directory in directories)
                pending.Push(directory);

            string[] files;
            try { files = Directory.GetFiles(current); } catch { continue; }
            foreach (var file in files)
                yield return file;
        }
    }

    private static string Classify(string extension) => extension.ToLowerInvariant() switch
    {
        ".db" or ".sqlite" or ".sqlite3" => "database",
        ".csv" or ".xlsx" or ".xls" => "tabular-file",
        ".json" or ".xml" => "structured-file",
        ".pdf" => "document",
        _ => "file"
    };
}
