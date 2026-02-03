{
  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.biome = {
    enable = true;
    includes = [
      "*.js"
      "*.ts"
      "*.jsx"
      "*.tsx"
      "*.json"
    ];
    excludes = [
      "_generated/*"
      "*.gen.ts"
    ];
    settings = {
      formatter = {
        indentStyle = "space";
        indentWidth = 2;
      };
      javascript = {
        formatter = {
          quoteStyle = "double";
          semicolons = "always";
        };
      };
      linter = {
        rules = {
          suspicious = {
            noExplicitAny = "warn";
          };
        };
      };
    };
  };
}
