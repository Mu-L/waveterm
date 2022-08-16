package sstore

import (
	"fmt"
	"os"
	"path"
	"strconv"

	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"

	"github.com/golang-migrate/migrate/v4"
)

func MakeMigrate() (*migrate.Migrate, error) {
	wd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	migrationPathUrl := fmt.Sprintf("file://%s", path.Join(wd, "db", "migrations"))
	dbUrl := fmt.Sprintf("sqlite3://%s", GetSessionDBName())
	m, err := migrate.New(migrationPathUrl, dbUrl)
	if err != nil {
		return nil, fmt.Errorf("making migration [%s] db[%s]: %w", migrationPathUrl, GetSessionDBName(), err)
	}
	return m, nil
}

func MigrateUp() error {
	m, err := MakeMigrate()
	if err != nil {
		return err
	}
	err = m.Up()
	if err != nil {
		return err
	}
	return nil
}

func MigrateVersion() (uint, bool, error) {
	m, err := MakeMigrate()
	if err != nil {
		return 0, false, err
	}
	return m.Version()
}

func MigrateDown() error {
	m, err := MakeMigrate()
	if err != nil {
		return err
	}
	err = m.Down()
	if err != nil {
		return err
	}
	return nil
}

func MigrateGoto(n uint) error {
	m, err := MakeMigrate()
	if err != nil {
		return err
	}
	err = m.Migrate(n)
	if err != nil {
		return err
	}
	return nil
}

func TryMigrateUp() error {
	err := MigrateUp()
	if err != nil && err.Error() == migrate.ErrNoChange.Error() {
		err = nil
	}
	if err != nil {
		return err
	}
	return MigratePrintVersion()
}

func MigratePrintVersion() error {
	version, dirty, err := MigrateVersion()
	if err != nil {
		return fmt.Errorf("error getting db version: %v", err)
	}
	if dirty {
		return fmt.Errorf("error db is dirty, version=%d", version)
	}
	fmt.Printf("[db] version=%d\n", version)
	return nil
}

func MigrateCommandOpts(opts []string) error {
	var err error
	if opts[0] == "--migrate-up" {
		err = MigrateUp()
	} else if opts[0] == "--migrate-down" {
		err = MigrateDown()
	} else if opts[0] == "--migrate-goto" {
		n, err := strconv.Atoi(opts[1])
		if err == nil {
			err = MigrateGoto(uint(n))
		}
	} else {
		err = fmt.Errorf("invalid migration command")
	}
	if err != nil && err.Error() == migrate.ErrNoChange.Error() {
		err = nil
	}
	if err != nil {
		return err
	}
	return MigratePrintVersion()
}
