class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.string :customer_name
      t.decimal :total
      t.string :status
      t.boolean :shipped
      t.text :notes

      t.timestamps
    end
  end
end
