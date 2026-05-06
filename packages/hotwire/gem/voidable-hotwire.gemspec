Gem::Specification.new do |spec|
  spec.name          = "voidable-hotwire"
  spec.version       = "0.0.1"
  spec.authors       = ["Kaz Walker"]
  spec.email         = ["the.kaz.walker@gmail.com"]

  spec.summary       = "Rails integration for Voidable UI web components with Hotwire"
  spec.description   = "Provides a Rails engine, importmap pins, and view helpers for using Voidable UI web components with Stimulus and Turbo."
  spec.homepage      = "https://voidable.dev"
  spec.license       = "MIT"

  spec.required_ruby_version = ">= 3.1.0"

  spec.metadata["homepage_uri"]    = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/VoidableUI/Voidable"
  spec.metadata["changelog_uri"]   = "https://github.com/VoidableUI/Voidable/releases"

  spec.files = Dir["{app,config,lib}/**/*", "LICENSE.md", "README.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "railties", ">= 7.0"
end
