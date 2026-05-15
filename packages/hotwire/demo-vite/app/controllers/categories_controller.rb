class CategoriesController < ApplicationController
  before_action :set_category, only: %i[ show edit update destroy ]

  # GET /categories
  def index
    @pagy, @categories = pagy(Category.all)
  end

  # GET /categories/1
  # Renders the index view with the resource modal open so direct URL
  # navigation lands in the same place as clicking a row on the index.
  def show
    @pagy, @categories = pagy(Category.all)
    render :index
  end

  # GET /categories/new
  # Renders the index view with the new-resource modal open. @new_mode
  # tells the template which modal to render.
  def new
    @pagy, @categories = pagy(Category.all)
    @category = Category.new
    @new_mode = true
    render :index
  end

  # GET /categories/1/edit
  # Renders the index view with the edit modal open. @edit_mode tells the
  # template which modal to render.
  def edit
    @pagy, @categories = pagy(Category.all)
    @edit_mode = true
    render :index
  end

  # POST /categories
  def create
    @category = Category.new(category_params)

    if @category.save
      redirect_to @category, notice: "Category was successfully created."
    else
      @pagy, @categories = pagy(Category.all)
      @new_mode = true
      render :index, status: :unprocessable_content
    end
  end

  # PATCH/PUT /categories/1
  def update
    if @category.update(category_params)
      redirect_to @category, notice: "Category was successfully updated.", status: :see_other
    else
      @pagy, @categories = pagy(Category.all)
      @edit_mode = true
      render :index, status: :unprocessable_content
    end
  end

  # DELETE /categories/1
  def destroy
    @category.destroy!
    redirect_to categories_path, notice: "Category was successfully destroyed.", status: :see_other
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_category
      @category = Category.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def category_params
      params.expect(category: [ :name ])
    end
end
