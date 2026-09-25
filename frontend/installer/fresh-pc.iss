#define HubVersion "0.1.11"
#define PgInstaller "postgresql-17.11-4-windows-x64.exe"

[Setup]
AppId={{D38D2694-4B0D-4E6E-AAB6-2200AA364C81}
AppName=Internship Hub Fresh PC Setup
AppVersion={#HubVersion}
DefaultDirName={autopf}\Internship Hub Setup
CreateAppDir=no
Uninstallable=no
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\out\make\fresh-pc
OutputBaseFilename=InternshipHubFreshPCSetup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Files]
Source: "..\out\tooling\{#PgInstaller}"; Flags: dontcopy
Source: "..\out\make\squirrel.windows\x64\InternshipHubSetup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Code]
function PostgreSQLInstalled(): Boolean;
var
  BaseDir: String;
begin
  Result := RegQueryStringValue(HKLM64, 'SOFTWARE\PostgreSQL\Installations\postgresql-x64-17', 'Base Directory', BaseDir)
    and RegKeyExists(HKLM64, 'SYSTEM\CurrentControlSet\Services\postgresql-x64-17')
    and FileExists(AddBackslash(BaseDir) + 'bin\psql.exe');
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  PgArgs: String;
begin
  if CurStep <> ssPostInstall then Exit;

  if not PostgreSQLInstalled() then begin
    ExtractTemporaryFile('{#PgInstaller}');
    PgArgs := '--serverport 5432 --servicename postgresql-x64-17 --enable-components server,commandlinetools --datadir "' +
      ExpandConstant('{commonappdata}\InternshipHub\PostgreSQL\data') + '"';
    if not Exec(ExpandConstant('{tmp}\{#PgInstaller}'), PgArgs, '', SW_SHOWNORMAL, ewWaitUntilTerminated, ResultCode) or
      (ResultCode <> 0) or not PostgreSQLInstalled() then
      RaiseException('PostgreSQL setup did not finish. Internship Hub was not installed. Existing database files were not removed.');
  end;

  if not ExecAsOriginalUser(ExpandConstant('{tmp}\InternshipHubSetup.exe'), '', '', SW_SHOWNORMAL,
    ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
    RaiseException('Internship Hub desktop setup did not finish. PostgreSQL data was left in place.');
end;
