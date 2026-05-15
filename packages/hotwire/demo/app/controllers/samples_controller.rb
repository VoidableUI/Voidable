class SamplesController < ApplicationController
  before_action :set_sample, only: %i[ show edit update destroy ]

  # GET /samples
  def index
    @pagy, @samples = pagy(Sample.all)
  end

  # GET /samples/1
  # Renders the index view with the resource modal open so direct URL
  # navigation lands in the same place as clicking a row on the index.
  def show
    @pagy, @samples = pagy(Sample.all)
    render :index
  end

  # GET /samples/new
  # Renders the index view with the new-resource modal open. @new_mode
  # tells the template which modal to render.
  def new
    @pagy, @samples = pagy(Sample.all)
    @sample = Sample.new
    @new_mode = true
    render :index
  end

  # GET /samples/1/edit
  # Renders the index view with the edit modal open. @edit_mode tells the
  # template which modal to render.
  def edit
    @pagy, @samples = pagy(Sample.all)
    @edit_mode = true
    render :index
  end

  # POST /samples
  def create
    @sample = Sample.new(sample_params)

    if @sample.save
      redirect_to @sample, notice: "Sample was successfully created."
    else
      @pagy, @samples = pagy(Sample.all)
      @new_mode = true
      render :index, status: :unprocessable_content
    end
  end

  # PATCH/PUT /samples/1
  def update
    if @sample.update(sample_params)
      redirect_to @sample, notice: "Sample was successfully updated.", status: :see_other
    else
      @pagy, @samples = pagy(Sample.all)
      @edit_mode = true
      render :index, status: :unprocessable_content
    end
  end

  # DELETE /samples/1
  def destroy
    @sample.destroy!
    redirect_to samples_path, notice: "Sample was successfully destroyed.", status: :see_other
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_sample
      @sample = Sample.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def sample_params
      params.expect(sample: [ :name, :description, :count, :price, :weight, :active, :published_on, :scheduled_at, :opens_at, :category_id, :avatar, gallery: [] ])
    end
end
