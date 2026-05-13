class CreateProducts < ActiveRecord::Migration[8.1]
  def change
    create_table :products do |t|
      t.string :name
      t.text :description
      t.decimal :price
      t.integer :quantity
      t.float :weight
      t.boolean :active
      t.date :release_date
      t.datetime :published_at
      t.time :available_from
      t.references :category, null: false, foreign_key: true

      t.timestamps
    end
  end
end
