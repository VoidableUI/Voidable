package domain

import "errors"

var (
	// ErrUnknownElement is returned when a tag is not in the manifest.
	ErrUnknownElement = errors.New("unknown element")
	// ErrUnknownTarget is returned for an unsupported generator target.
	ErrUnknownTarget = errors.New("unknown target")
	// ErrUnknownLang is returned for an unsupported language name.
	ErrUnknownLang = errors.New("unknown language")
	// ErrNoAssets is returned when the binary was built without the
	// embedded library bundle.
	ErrNoAssets = errors.New("binary built without embedded assets")
	// ErrManifest is returned when the embedded manifest cannot be read.
	ErrManifest = errors.New("invalid manifest")
)
