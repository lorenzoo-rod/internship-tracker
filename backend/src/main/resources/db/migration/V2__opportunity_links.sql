ALTER TABLE opportunities
    ADD COLUMN discovery_url VARCHAR(2048),
    ADD COLUMN application_url VARCHAR(2048),
    ADD COLUMN status_url VARCHAR(2048);

UPDATE opportunities SET application_url = posting_url WHERE stage = 'SAVED';
UPDATE opportunities SET status_url = posting_url WHERE stage <> 'SAVED';

ALTER TABLE opportunities DROP COLUMN posting_url;

CREATE UNIQUE INDEX opportunities_discovery_url_unique ON opportunities (discovery_url);
CREATE UNIQUE INDEX opportunities_application_url_unique ON opportunities (application_url);
