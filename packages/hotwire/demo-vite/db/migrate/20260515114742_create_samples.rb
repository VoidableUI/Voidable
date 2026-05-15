class CreateSamples < ActiveRecord::Migration[8.1]
  def change
    create_table :samples do |t|
      t.string :name
      t.text :description
      t.integer :count
      t.decimal :price
      t.float :weight
      t.boolean :active
      t.date :published_on
      t.datetime :scheduled_at
      t.time :opens_at
      t.references :category, null: false, foreign_key: true

      t.timestamps
    end
  end
end
