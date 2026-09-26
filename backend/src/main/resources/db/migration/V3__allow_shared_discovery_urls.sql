DROP INDEX IF EXISTS opportunities_discovery_url_unique;
CREATE UNIQUE INDEX opportunities_discovery_only_unique
    ON opportunities (discovery_url)
    WHERE application_url IS NULL AND discovery_url IS NOT NULL;
